import React from "react";
import { Button } from "./Button";
import { Plus, Trash2 } from "lucide-react";

export default {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["primary", "secondary", "danger", "outline", "ghost", "link"],
    },
    size: {
      control: { type: "select" },
      options: ["default", "sm", "lg", "icon"],
    },
    disabled: { control: "boolean" },
    isLoading: { control: "boolean" },
  },
};

export const Primary = {
  args: {
    children: "Primary Button",
    variant: "primary",
  },
};

export const Secondary = {
  args: {
    children: "Secondary Button",
    variant: "secondary",
  },
};

export const Danger = {
  args: {
    children: "Danger Button",
    variant: "danger",
  },
};

export const Outline = {
  args: {
    children: "Outline Button",
    variant: "outline",
  },
};

export const Ghost = {
  args: {
    children: "Ghost Button",
    variant: "ghost",
  },
};

export const Loading = {
  args: {
    children: "Saving...",
    variant: "primary",
    isLoading: true,
  },
};

export const Disabled = {
  args: {
    children: "Disabled Button",
    variant: "primary",
    disabled: true,
  },
};

export const WithIcon = {
  render: (args) => (
    <Button {...args}>
      <Plus className="w-4 h-4 mr-2" />
      Tambah Pasien
    </Button>
  ),
};

export const IconButton = {
  render: (args) => (
    <Button variant="outline" size="icon" aria-label="Hapus data" {...args}>
      <Trash2 className="w-4 h-4 text-red-500" />
    </Button>
  ),
};
