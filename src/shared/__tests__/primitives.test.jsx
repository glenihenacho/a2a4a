import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge, VBadge, ScoreBar, Card, ScrollX, Sparkline, BarChart, DonutChart } from "../primitives";

describe("Badge", () => {
  it("renders children text", () => {
    render(<Badge color="#fff" bg="#000">LIVE</Badge>);
    expect(screen.getByText("LIVE")).toBeInTheDocument();
  });

  it("applies color and background", () => {
    render(<Badge color="#42A5F5" bg="rgba(66,165,245,.1)">SEO</Badge>);
    const el = screen.getByText("SEO");
    expect(el.style.color).toBe("#42A5F5");
  });
});

describe("VBadge", () => {
  it("renders SEO badge with blue color", () => {
    render(<VBadge v="SEO" />);
    expect(screen.getByText("SEO")).toBeInTheDocument();
  });

  it("renders AIO badge", () => {
    render(<VBadge v="AIO" />);
    expect(screen.getByText("AIO")).toBeInTheDocument();
  });

  it("falls back to SEO colors for unknown vertical", () => {
    render(<VBadge v="OTHER" />);
    expect(screen.getByText("OTHER")).toBeInTheDocument();
  });
});

describe("ScoreBar", () => {
  it("renders the value label", () => {
    render(<ScoreBar value={75} color="#66BB6A" />);
    expect(screen.getByText("75")).toBeInTheDocument();
  });
});

describe("Card", () => {
  it("renders children", () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("uses smaller border-radius on mobile", () => {
    const { container } = render(<Card mob={true}>Content</Card>);
    expect(container.firstChild.style.borderRadius).toBe("12px");
  });

  it("uses larger border-radius on desktop", () => {
    const { container } = render(<Card mob={false}>Content</Card>);
    expect(container.firstChild.style.borderRadius).toBe("14px");
  });
});

describe("ScrollX", () => {
  it("renders children in a scrollable container", () => {
    render(<ScrollX><span>Scrollable</span></ScrollX>);
    expect(screen.getByText("Scrollable")).toBeInTheDocument();
  });
});

describe("Sparkline", () => {
  it("renders an SVG element", () => {
    const { container } = render(<Sparkline data={[1, 3, 2, 5, 4]} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders a polyline and polygon", () => {
    const { container } = render(<Sparkline data={[10, 20, 15]} />);
    expect(container.querySelector("polyline")).toBeInTheDocument();
    expect(container.querySelector("polygon")).toBeInTheDocument();
  });
});

describe("BarChart", () => {
  const data = [
    { clearing: 2400, milestones: 1800 },
    { clearing: 3100, milestones: 2200 },
  ];
  const labels = ["Jan", "Feb"];
  const keys = ["clearing", "milestones"];
  const colors = ["#42A5F5", "#66BB6A"];

  it("renders labels", () => {
    render(<BarChart data={data} labels={labels} keys={keys} colors={colors} />);
    expect(screen.getByText("Jan")).toBeInTheDocument();
    expect(screen.getByText("Feb")).toBeInTheDocument();
  });

  it("renders legend entries", () => {
    render(<BarChart data={data} labels={labels} keys={keys} colors={colors} />);
    expect(screen.getByText("Clearing")).toBeInTheDocument();
    expect(screen.getByText("Milestones")).toBeInTheDocument();
  });
});

describe("DonutChart", () => {
  const segments = [
    { value: 55, color: "#42A5F5" },
    { value: 45, color: "#90CAF9" },
  ];

  it("renders an SVG element", () => {
    const { container } = render(<DonutChart segments={segments} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders one circle per segment", () => {
    const { container } = render(<DonutChart segments={segments} />);
    const circles = container.querySelectorAll("circle");
    expect(circles).toHaveLength(2);
  });

  it("applies segment colors", () => {
    const { container } = render(<DonutChart segments={segments} />);
    const circles = container.querySelectorAll("circle");
    expect(circles[0].getAttribute("stroke")).toBe("#42A5F5");
    expect(circles[1].getAttribute("stroke")).toBe("#90CAF9");
  });
});
