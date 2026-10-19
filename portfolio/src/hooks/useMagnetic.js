import { useRef } from "react";

// Deprecated: no magnetic pull any more. Delete once nothing imports it.
export function useMagnetic() {
  return useRef(null);
}
