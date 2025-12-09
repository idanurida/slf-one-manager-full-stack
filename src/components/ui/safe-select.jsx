// components/ui/safe-select.jsx
import { Select } from "@/components/ui/select";

export const SafeSelect = Select;

export const SafeSelectItem = ({ value, children, ...props }) => {
  // Ensure value is never empty string
  const safeValue = value === "" ? "empty-placeholder" : (value || "default-value");
  
  return (
    <Select.Item value={safeValue} {...props}>
      {children || "Empty"}
    </Select.Item>
  );
};

// HOC untuk wrap semua Select.Item
export function withSafeSelect(Component) {
  return function SafeSelectWrapper(props) {
    return <Component {...props} />;
  };
}
