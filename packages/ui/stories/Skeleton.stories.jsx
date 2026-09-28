import React from "react";
import { Skeleton, SkeletonText, SkeletonCard } from "../src/Skeleton";

export default {
  title: "UI/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
};

export const DefaultLine = {
  render: () => <Skeleton className="h-4 w-64" />,
};

export const MultiLineText = {
  render: () => <SkeletonText lines={4} className="max-w-md" />,
};

export const CardPlaceholder = {
  render: () => <SkeletonCard className="max-w-md" />,
};
