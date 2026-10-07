import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Field, inputClass, PasswordInput } from "./field"

describe("Field", () => {
  it("labels the control and links its error and hint", () => {
    render(
      <Field id="email" label="Email" error="Please enter a valid email address." hint={<span>We never share it.</span>}>
        {(control) => <input className={inputClass} {...control} />}
      </Field>,
    )
    const input = screen.getByLabelText("Email")
    expect(input).toHaveAttribute("aria-invalid", "true")
    expect(input).toHaveAccessibleDescription("Please enter a valid email address. We never share it.")
  })

  it("announces server answers but not field checks", () => {
    const { rerender } = render(
      <Field id="pw" label="Password" error="Please fill this in.">
        {(control) => <input {...control} />}
      </Field>,
    )
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    rerender(
      <Field id="pw" label="Password" error="Wrong password." announce>
        {(control) => <input {...control} />}
      </Field>,
    )
    expect(screen.getByRole("alert")).toHaveTextContent("Wrong password.")
  })

  it("leaves a valid control unmarked", () => {
    render(<Field id="name" label="Name">{(control) => <input {...control} />}</Field>)
    expect(screen.getByLabelText("Name")).not.toHaveAttribute("aria-invalid")
    expect(screen.getByLabelText("Name")).not.toHaveAttribute("aria-describedby")
  })
})

describe("PasswordInput", () => {
  it("shows and hides the password", async () => {
    const user = userEvent.setup()
    render(<PasswordInput aria-label="Password" showLabel="Show" hideLabel="Hide" defaultValue="Stone2026" />)
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password")
    await user.click(screen.getByRole("button", { name: "Show" }))
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text")
    expect(screen.getByRole("button", { name: "Hide" })).toHaveAttribute("aria-pressed", "true")
  })

  it("turns the line wine when the field is invalid, as on focus", () => {
    render(<PasswordInput aria-label="Password" aria-invalid showLabel="Show" hideLabel="Hide" />)
    expect(screen.getByLabelText("Password").parentElement?.className).toContain("has-aria-invalid:border-accent")
    expect(inputClass).toContain("aria-invalid:border-accent")
    expect(inputClass).toContain("min-h-11")
  })

  it("hides the browser's own reveal button so there is only one", () => {
    render(<PasswordInput aria-label="Password" showLabel="Show" hideLabel="Hide" />)
    expect(screen.getByLabelText("Password").className).toContain("[&::-ms-reveal]:hidden")
  })
})
