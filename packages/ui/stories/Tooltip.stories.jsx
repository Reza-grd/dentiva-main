import React from "react";
import { Tooltip } from "../src/Tooltip";
import { Button } from "../src/Button";
import { Info } from "lucide-react";

export default {
  title: "UI/Tooltip",
  component: Tooltip,
  tags: ["autodocs"],
};

export const Default = {
  render: () => (
    <div className="p-12 flex justify-center">
      <Tooltip content="Hapus data rekam medis">
        <Button variant="outline" size="sm">
          Arahkan Kursor / Fokus Keyboard
        </Button>
      </Tooltip>
    </div>
  ),
};

export const IconOnlyWithTooltip = {
  render: () => (
    <div className="p-12 flex justify-center">
      <Tooltip content="Informasi Hak Akses" side="right">
        <button
          aria-label="Informasi Hak Akses"
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Info className="h-5 w-5" />
        </button>
      </Tooltip>
    </div>
  ),
};
