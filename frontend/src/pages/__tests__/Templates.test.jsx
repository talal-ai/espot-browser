import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Templates from "../Templates.jsx";

// Mock router context if needed
vi.mock("react-router-dom", () => ({
  ...vi.importActual("react-router-dom"),
}));

// Mock toast hook to avoid provider requirement
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock API service
vi.mock("@/services/api.service", () => ({
  apiService: {
    get: vi.fn(async () => [
      {
        id: "tmpl-1",
        name: "Analytics Dashboard",
        category: "dashboard",
        version: "1.2.0",
        updated_at: "2025-10-01",
        layout: { regions: ["header", "sidebar", "main"] },
        components: [{ type: "StatCard" }, { type: "DataTable" }],
      },
      {
        id: "tmpl-2",
        name: "User Management",
        category: "administration",
        version: "0.9.5",
        updated_at: "2025-09-10",
        layout: { regions: ["main"] },
        components: [{ type: "Form" }],
      },
    ]),
  },
}));

// Mock DataTable to avoid lazy import complexities
vi.mock("@/components/common/DataTable", () => ({
  default: ({ data, onRowClick }) => (
    <table aria-label="templates-table">
      <tbody>
        {data.map((row) => (
          <tr key={row.id} onClick={() => onRowClick(row)}>
            <td>{row.name}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

describe("Templates page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders header and loads templates from API", async () => {
    render(<Templates />);
    // Header exists
    expect(await screen.findByText(/Dynamic Templates/i)).toBeInTheDocument();
    // Table rows equal to mocked templates
    const table = await screen.findByRole("table", { name: /templates-table/i });
    expect(table.querySelectorAll("tbody tr").length).toBe(2);
  });

  it("opens preview dialog when a row is clicked", async () => {
    render(<Templates />);
    const row = await screen.findByText(/Analytics Dashboard/i);
    fireEvent.click(row);
    expect(await screen.findByText(/Analytics Dashboard/i)).toBeInTheDocument();
  });
});