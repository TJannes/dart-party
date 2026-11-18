// Sends one command to the running driver and prints the answer.
//   node .claude/skills/run-app/drive.mjs click "New party"
const PORT = Number(process.env.DRIVER_PORT || 9400)
const response = await fetch(`http://127.0.0.1:${PORT}`, {
  method: 'POST',
  body: JSON.stringify(process.argv.slice(2)),
})
const text = await response.text()
console.log(text)
if (text.startsWith('ERROR')) process.exit(1)
