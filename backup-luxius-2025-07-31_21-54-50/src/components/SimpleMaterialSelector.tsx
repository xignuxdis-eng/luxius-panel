import { getAvailableMaterials, getMaterialById } from "../data/materials";

interface SimpleMaterialSelectorProps {
  selectedMaterial: string;
  onMaterialChange: (materialId: string) => void;
  className?: string;
}

export default function SimpleMaterialSelector({
  selectedMaterial,
  onMaterialChange,
  className = ""
}: SimpleMaterialSelectorProps) {
  const availableMaterials = getAvailableMaterials();

  return (
    <select
      value={selectedMaterial}
      onChange={(e) => onMaterialChange(e.target.value)}
      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${className || "border-gray-300 focus:ring-blue-500"}`}
    >
      <option value="">Seleccionar material</option>
      {availableMaterials.map(material => (
        <option key={material.id} value={material.id}>
          {material.displayName}
        </option>
      ))}
    </select>
  );
} 