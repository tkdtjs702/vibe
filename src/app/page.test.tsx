import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("renders the dashboard title", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: "영화 박스오피스 목록" }),
    ).toBeInTheDocument();
  });
});
