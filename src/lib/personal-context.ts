import { createContext, useContext } from "react";
import { emptyPersonalState } from "./personal-workflow";
export const PersonalContext = createContext({
  state: emptyPersonalState,
  error: "",
  act: async (_action: string, _payload: Record<string, unknown>) => false,
});
export const usePersonalWorkflow = () => useContext(PersonalContext);
