import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SkillBadge } from "@/components/SkillBadge";
import type { Skill } from "@/services/types";

export function SkillSelector({
  selected,
  catalog,
  onAdd,
  onRemove,
  busy,
}: {
  selected: Skill[];
  catalog: Skill[];
  onAdd: (skill: Skill) => void;
  onRemove: (skill: Skill) => void;
  busy?: boolean;
}) {
  const [value, setValue] = useState("");

  const suggestions = catalog
    .filter((skill) => !selected.some((s) => s.id === skill.id))
    .filter((skill) =>
      skill.name.toLowerCase().includes(value.trim().toLowerCase())
    )
    .slice(0, 10);

  const submit = () => {
    const text = value.trim();

    if (!text) return;

    const skill = catalog.find(
      (s) => s.name.toLowerCase() === text.toLowerCase()
    );

    if (!skill || selected.some((s) => s.id === skill.id)) return;

    onAdd(skill);
    setValue("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {selected.length ? (
          selected.map((skill) => (
            <SkillBadge
              key={skill.id}
              skill={skill.name}
              onRemove={() => onRemove(skill)}
            />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No skills added yet.
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Add a skill (e.g. React)"
          className="h-10 rounded-xl bg-background/50"
        />

        <Button
          type="button"
          variant="subtle"
          onClick={submit}
          disabled={busy}
        >
          <Plus /> Add
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground">Suggestions</p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {suggestions.map((skill) => (
              <SkillBadge
                key={skill.id}
                skill={skill.name}
                tone="outline"
                onClick={() => onAdd(skill)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
