export default function PersonalitySliders({ values, onChange }) {
  return (
    <div className="sliders">
      {Object.entries(values).map(([trait, value]) => (
        <label key={trait}>
          {trait.replace("_", " ")}: {value}
          <input
            type="range"
            min={0}
            max={100}
            value={value}
            onChange={(e) => onChange(trait, Number(e.target.value))}
          />
        </label>
      ))}
    </div>
  );
}
