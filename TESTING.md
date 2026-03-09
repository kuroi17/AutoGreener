# 🧪 End-to-End Testing Checklist

## Test Environment

- ✅ Backend running on http://localhost:5000
- ✅ Frontend running on http://localhost:5173
- ✅ Supabase connected and schedules table created

## Test Cases

### ✅ Test 1: Dashboard Loads Schedules

1. Open http://localhost:5173/
2. Dashboard should show existing schedule(s) from database
3. Stats cards should display correct counts

**Expected:** Schedule from earlier test visible (C:/Users/HP LAPTOP 15s/test)

---

### ✅ Test 2: Create New Schedule

1. Click "Schedule New Push" or navigate to /add
2. Fill in the form:
   - Repo Path: `C:/Users/HP LAPTOP 15s/PushClock`
   - Branch: `main`
   - Date: Tomorrow's date
   - Time: A time in the future (e.g., 2 hours from now)
3. Click "Schedule Push"

**Expected:**

- Success notification appears
- Redirects to dashboard after 2 seconds
- New schedule appears in the list

---

### ✅ Test 3: Delete Schedule

1. On dashboard, find a schedule card
2. Click the delete button (trash icon)
3. Confirm deletion

**Expected:**

- Schedule disappears from the list
- Success notification appears
- API call removes from database

---

### ✅ Test 4: Stats Update

1. After adding/deleting schedules
2. Check the stats cards at the top

**Expected:**

- "Total Scheduled" reflects current count
- "Completed" shows completed pushes
- Numbers update in real-time

---

### ✅ Test 5: Loading States

1. Refresh the dashboard
2. Observe loading spinner briefly

**Expected:**

- Loading spinner appears while fetching data
- Data loads and replaces spinner

---

### ✅ Test 6: Error Handling

1. Stop the backend server (Ctrl+C in backend terminal)
2. Try to add a new schedule or refresh dashboard

**Expected:**

- Error notification appears
- User-friendly error message displayed

---

### ✅ Test 7: Scheduler Logic (Advanced)

1. Create a schedule for 2-3 minutes in the future
2. Wait for the scheduled time
3. Check backend console logs

**Expected:**

- Backend logs show job execution
- Status updates in database to "completed" or "error"
- (Note: Will only work if repo path is valid and has changes to push)

---

## Current Test Data in Database

```json
{
  "id": "16ddf1e5-b4f6-4c72-89f9-6dcb804ef0ce",
  "repo_path": "C:/Users/HP LAPTOP 15s/test",
  "branch": "main",
  "push_time": "2026-03-10T14:30:00",
  "status": "scheduled"
}
```

---

## Troubleshooting

### CORS Errors

- Backend has `cors()` enabled - should work
- If issues persist, check browser console

### API Connection Failed

- Verify backend is running on port 5000
- Check `.env` files in both `backend/` and `frontend-vite/`

### Supabase Errors

- Verify credentials in `backend/.env`
- Check Supabase dashboard for table structure
- Ensure RLS (Row Level Security) is disabled for testing

---

## Next Steps After Testing

1. Test scheduled push with a real repo (one with uncommitted changes)
2. Add email notifications (optional)
3. Deploy to production
4. Add authentication (optional)
