import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import SpeakerNameEditor from "../SpeakerNameEditor";

afterEach(cleanup);

describe("SpeakerNameEditor", () => {
  it("renders nothing when speakers list is empty", () => {
    const { container } = render(
      <SpeakerNameEditor speakers={[]} names={{}} onChange={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders an input for each speaker", () => {
    render(
      <SpeakerNameEditor
        speakers={["A", "B"]}
        names={{ A: "Paweł", B: "Dave" }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByLabelText("Nazwa mówcy A")).toHaveValue("Paweł");
    expect(screen.getByLabelText("Nazwa mówcy B")).toHaveValue("Dave");
  });

  it("falls back to speaker ID when name is not in names map", () => {
    render(
      <SpeakerNameEditor speakers={["A"]} names={{}} onChange={vi.fn()} />
    );
    expect(screen.getByLabelText("Nazwa mówcy A")).toHaveValue("A");
  });

  it("calls onChange with updated name when input changes", () => {
    const onChange = vi.fn();
    render(
      <SpeakerNameEditor
        speakers={["A", "B"]}
        names={{ A: "Paweł", B: "Dave" }}
        onChange={onChange}
      />
    );

    fireEvent.change(screen.getByLabelText("Nazwa mówcy A"), {
      target: { value: "Paweł Strączek" },
    });

    expect(onChange).toHaveBeenCalledWith({ A: "Paweł Strączek", B: "Dave" });
  });

  it("preserves other speaker names when editing one", () => {
    const onChange = vi.fn();
    render(
      <SpeakerNameEditor
        speakers={["A", "B", "C"]}
        names={{ A: "Alice", B: "Bob", C: "Carol" }}
        onChange={onChange}
      />
    );

    fireEvent.change(screen.getByLabelText("Nazwa mówcy B"), {
      target: { value: "Robert" },
    });

    expect(onChange).toHaveBeenCalledWith({ A: "Alice", B: "Robert", C: "Carol" });
  });
});
