import React, { useState } from "react";
import { Box, Text, useInput } from "ink";

interface InputProps {
  onSubmit: (value: string) => void;
  disabled?: boolean;
}

function findWordBoundaryLeft(text: string, pos: number): number {
  let i = pos;
  while (i > 0 && text[i - 1] === " ") i--;
  while (i > 0 && text[i - 1] !== " ") i--;
  return i;
}

function findWordBoundaryRight(text: string, pos: number): number {
  let i = pos;
  while (i < text.length && text[i] !== " ") i++;
  while (i < text.length && text[i] === " ") i++;
  return i;
}

export function Input({ onSubmit, disabled = false }: InputProps) {
  const [value, setValue] = useState("");
  const [cursor, setCursor] = useState(0);

  useInput(
    (input, key) => {
      if (disabled) return;

      if (key.return) {
        if (value.trim()) {
          onSubmit(value);
          setValue("");
          setCursor(0);
        }
        return;
      }

      if (key.backspace || key.delete) {
        if (cursor > 0) {
          setValue(value.slice(0, cursor - 1) + value.slice(cursor));
          setCursor(cursor - 1);
        }
        return;
      }

      if (key.leftArrow && key.ctrl) {
        setCursor(findWordBoundaryLeft(value, cursor));
        return;
      }

      if (key.rightArrow && key.ctrl) {
        setCursor(findWordBoundaryRight(value, cursor));
        return;
      }

      if (key.leftArrow) {
        setCursor(Math.max(0, cursor - 1));
        return;
      }
      if (key.rightArrow) {
        setCursor(Math.min(value.length, cursor + 1));
        return;
      }

      if (input && !key.ctrl && !key.meta) {
        setValue(value.slice(0, cursor) + input + value.slice(cursor));
        setCursor(cursor + input.length);
      }
    },
    { isActive: !disabled },
  );

  const beforeCursor = value.slice(0, cursor);
  const atCursor = value[cursor] ?? "";
  const afterCursor = value.slice(cursor + 1);

  return (
    <Box>
      <Text color="blue" bold>
        {"> "}
      </Text>
      <Text>{beforeCursor}</Text>
      {!disabled && <Text inverse>{atCursor || " "}</Text>}
      <Text>{afterCursor}</Text>
    </Box>
  );
}
