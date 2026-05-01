export default function SpiceMeter({ value, onChange }) {
  return (
    <label>
      Spice Level: {value}
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
