import { act } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import TestRenderer from "react-test-renderer";
import { describe, it, expect, vi, afterEach, beforeAll, beforeEach } from "vitest";

type RenderResult = {
  container: HTMLDivElement;
  cleanup: () => void;
};

function renderComponent(element: ReactElement): RenderResult {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });

  return {
    container,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
  });
}

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(mockImplementation: typeof fetch) {
  vi.stubGlobal("fetch", mockImplementation);
  const globalWithWindow = globalThis as typeof globalThis & { window?: { fetch?: typeof fetch } };
  if (globalWithWindow.window) {
    globalWithWindow.window.fetch = mockImplementation;
  }
}

describe("PasscodeGate", () => {
  it("displays inline validation when submitting without a passcode", async () => {
    const onAuthenticated = vi.fn();
    const { PasscodeGate } = await importPageModule();
    const { container, cleanup } = renderComponent(
      <PasscodeGate
        hasPasscode
        onAuthenticated={onAuthenticated}
        statusError={null}
        refetchStatus={async () => {}}
      />,
    );

    const submitButton = container.querySelector("button[type='submit']");
    await act(async () => {
      submitButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("Enter your passcode.");
    expect(onAuthenticated).not.toHaveBeenCalled();
    cleanup();
  });

  it("submits a passcode and notifies the parent on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const onAuthenticated = vi.fn();
    const { PasscodeGate } = await importPageModule();
    let renderer: TestRenderer.ReactTestRenderer | null = null;
    await act(async () => {
      renderer = TestRenderer.create(
        <PasscodeGate
          hasPasscode
          onAuthenticated={onAuthenticated}
          statusError={null}
          refetchStatus={async () => {}}
          fetchImpl={fetchMock as unknown as typeof fetch}
        />,
      );
    });

    const root = renderer!.root;
    const input = root.findAllByType("input")[0];
    act(() => {
      input.props.onChange({
        target: { value: "2468" },
      });
    });

    await act(async () => {
      await root.findByType("form").props.onSubmit({
        preventDefault() {},
      });
    });
    await flushEffects();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/verify",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(onAuthenticated).toHaveBeenCalled();
    renderer?.unmount();
  });
});

describe("HistoryPreview", () => {
  it("renders fetched entries with pagination metadata", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        entries: [
          {
            id: "entry-1",
            entryType: "ANGER",
            title: "🤬 001",
            bodyMarkdown: "Body",
            createdAt: new Date().toISOString(),
          },
        ],
        meta: { page: 1, pageSize: 10, total: 1 },
      }),
    });
    stubFetch(fetchMock as unknown as typeof fetch);

    const { HistoryPreview } = await importPageModule();
    const { container, cleanup } = renderComponent(<HistoryPreview refreshKey={0} />);
    await flushEffects();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/entries?page=1&pageSize=10",
      expect.objectContaining({ method: "GET" }),
    );
    expect(container.textContent).toContain("Your full archive");
    expect(container.textContent).toContain("Showing 1");
    expect(container.textContent).toContain("Full archive →");
    cleanup();
  });

  it("shows an error when entries are locked behind authentication", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    });
    stubFetch(fetchMock as unknown as typeof fetch);

    const { HistoryPreview } = await importPageModule();
    const { container, cleanup } = renderComponent(<HistoryPreview refreshKey={0} />);
    await flushEffects();

    expect(container.textContent).toContain("Unlock your journal to view history.");
    cleanup();
  });
});
let importCounter = 0;
async function importPageModule() {
  importCounter += 1;
  return import(
    /* @vite-ignore */ `./page.tsx?test=${importCounter}`
  ) as Promise<typeof import("./page")>;
}

beforeEach(() => {
  vi.resetModules();
});
