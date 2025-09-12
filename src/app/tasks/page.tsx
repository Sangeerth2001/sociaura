import React from 'react'

async function TasksPage() {

    const responce = await fetch("http://localhost:3000/api/tasks" , {cache:"no-store"})
    const tasks = await responce.json()
    console.log(tasks)
  return (
    <div>TasksPage</div>
  )
}

export default TasksPage