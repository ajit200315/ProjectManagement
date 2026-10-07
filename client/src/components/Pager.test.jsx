import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Pager from "./Pager.jsx";

const pagination = (overrides) => ({
  page: 2,
  limit: 20,
  total: 100,
  totalPages: 5,
  hasMore: true,
  ...overrides,
});

describe("Pager", () => {
  it("renders nothing when everything fits on one page", () => {
    const { container } = render(
      <Pager
        pagination={pagination({ totalPages: 1, total: 3 })}
        onPage={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when there is no pagination at all", () => {
    const { container } = render(<Pager onPage={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("moves between pages", async () => {
    const onPage = vi.fn();
    const user = userEvent.setup();

    render(<Pager pagination={pagination()} onPage={onPage} />);

    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(onPage).toHaveBeenCalledWith(3);

    await user.click(screen.getByRole("button", { name: /previous/i }));
    expect(onPage).toHaveBeenCalledWith(1);
  });

  it("cannot go back from the first page or forward from the last", () => {
    const { rerender } = render(
      <Pager pagination={pagination({ page: 1 })} onPage={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next/i })).toBeEnabled();

    rerender(<Pager pagination={pagination({ page: 5 })} onPage={vi.fn()} />);
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("reports where the user is", () => {
    render(<Pager pagination={pagination()} onPage={vi.fn()} />);
    expect(screen.getByText(/page 2 of 5/i)).toBeInTheDocument();
    expect(screen.getByText(/100 total/i)).toBeInTheDocument();
  });
});
