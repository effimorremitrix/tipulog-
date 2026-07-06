"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-primary hover:bg-primary-dark text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
    >
      🖨️ הדפסת קבלה
    </button>
  );
}
