import React, { useEffect, useState } from "react";
import { TrueForm } from "../data/forms";
import { getUnlockedForms } from "../utils/formMemory";

const FormGallery: React.FC = () => {
  const [forms, setForms] = useState<TrueForm[]>([]);

  useEffect(() => {
    const unlocked = getUnlockedForms();
    setForms(unlocked);
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto text-white">
      <h2 className="text-3xl font-bold mb-4">🪞 True Form Gallery</h2>

      {forms.length === 0 ? (
        <p className="text-pink-300 italic">
          You haven't unlocked any forms yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {forms.map((form) => (
            <div
              key={form.id}
              className="bg-gradient-to-br from-gray-800 to-black p-4 rounded-lg border border-pink-700"
            >
              {form.image && (
                <img
                  src={form.image}
                  alt={form.name}
                  className="mb-3 rounded shadow-lg max-h-48 object-contain mx-auto"
                />
              )}
              <h3 className="text-xl font-semibold mb-1">{form.name}</h3>
              <p className="text-sm italic text-pink-300 mb-2">{form.tone}</p>
              <p className="text-xs text-gray-300">{form.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FormGallery;
