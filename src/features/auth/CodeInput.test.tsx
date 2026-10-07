import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { emptyCode } from "./code"
import CodeInput from "./CodeInput"

function Harness() {
  const [code, setCode] = useState(emptyCode())
  return (
    <>
      <CodeInput idPrefix="code" value={code} onChange={setCode} label="6-digit code" digitLabel={(n) => `Digit ${n}`} />
      <output>{code.join("")}</output>
    </>
  )
}

const box = (n: number) => screen.getByLabelText(`Digit ${n}`)

describe("CodeInput", () => {
  it("is one left-to-right group of six numeric boxes", () => {
    render(<Harness />)
    const group = screen.getByRole("group", { name: "6-digit code" })
    expect(group).toHaveAttribute("dir", "ltr")
    expect(group.querySelectorAll("input")).toHaveLength(6)
    expect(box(1)).toHaveAttribute("inputmode", "numeric")
    expect(box(1)).toHaveAttribute("autocomplete", "one-time-code")
  })

  it("moves on after each digit and ignores letters", async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(box(1))
    await user.keyboard("1a2")
    expect(screen.getByRole("status")).toHaveTextContent("12")
    expect(box(3)).toHaveFocus()
  })

  it("goes back with Backspace on an empty box", async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(box(1))
    await user.keyboard("12")
    await user.keyboard("{Backspace}")
    expect(box(2)).toHaveFocus()
    expect(screen.getByRole("status")).toHaveTextContent(/^1$/)
  })

  it("fills every box when a whole code is pasted into any of them", async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(box(3))
    await user.paste("123 456")
    expect(screen.getByRole("status")).toHaveTextContent("123456")
    expect(box(6)).toHaveFocus()
  })
})
