import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmButton from "./ConfirmButton.jsx";

describe("ConfirmButton", () => {
  it("arms on the first click rather than firing", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmButton onConfirm={onConfirm} confirmLabel="Really delete?">
        Delete
      </ConfirmButton>,
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Really delete?" }),
    ).toBeInTheDocument();
  });

  it("fires on the second click", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();

    render(<ConfirmButton onConfirm={onConfirm}>Delete</ConfirmButton>);

    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("button"));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("disarms itself so a stray click does not leave it primed", async () => {
    vi.useFakeTimers();
    const onConfirm = vi.fn();

    render(
      <ConfirmButton onConfirm={onConfirm} timeout={4000}>
        Delete
      </ConfirmButton>,
    );

    // fireEvent rather than userEvent: userEvent awaits real timers
    // internally, which deadlocks against the fake ones.
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4100);
    });

    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("does not fire while disabled", () => {
    const onConfirm = vi.fn();

    render(
      <ConfirmButton onConfirm={onConfirm} disabled>
        Delete
      </ConfirmButton>,
    );

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();

    // userEvent refuses to click a disabled element, so assert the browser
    // behaviour directly: the handler must not run.
    fireEvent.click(button);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
