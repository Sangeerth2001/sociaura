async function TasksPage() {
  const response = await fetch("http://localhost:3000/api/tasks", {
    cache: "no-store",
  });
  const tasks = await response.json();

  console.log("tasks:", tasks);

  return <div>TasksPage</div>;
}
export default TasksPage;