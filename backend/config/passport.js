const passport = require("passport");
const GitHubStrategy = require("passport-github2").Strategy;
const supabase = require("./supabase");

// Serialize user to session (store user ID)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session (retrieve user by ID)
passport.deserializeUser(async (id, done) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    done(null, data);
  } catch (error) {
    done(error, null);
  }
});

// GitHub OAuth Strategy
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: `${process.env.API_URL || process.env.BACKEND_URL || "https://autogreener.onrender.com"}/auth/github/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists
        const { data: existingUser, error: fetchError } = await supabase
          .from("users")
          .select("*")
          .eq("github_id", profile.id)
          .single();

        if (existingUser) {
          // Update access token if user exists
          const { data: updatedUser, error: updateError } = await supabase
            .from("users")
            .update({
              access_token: accessToken,
              username: profile.username,
              avatar_url: profile.photos?.[0]?.value || null,
              updated_at: new Date().toISOString(),
            })
            .eq("github_id", profile.id)
            .select()
            .single();

          if (updateError) throw updateError;
          return done(null, updatedUser);
        }

        // Create new user if doesn't exist
        const { data: newUser, error: createError } = await supabase
          .from("users")
          .insert([
            {
              github_id: profile.id,
              username: profile.username,
              avatar_url: profile.photos?.[0]?.value || null,
              access_token: accessToken,
            },
          ])
          .select()
          .single();

        if (createError) throw createError;
        done(null, newUser);
      } catch (error) {
        console.error("Error in GitHub OAuth strategy:", error);
        done(error, null);
      }
    },
  ),
);

module.exports = passport;
