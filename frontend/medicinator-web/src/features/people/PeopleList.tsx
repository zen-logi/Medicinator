import { Check, Pencil, Trash2, UserRound, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { Button } from "@/shared/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/card";
import { Input } from "@/shared/components/input";
import type { Person } from "@/shared/types/domain";

type PeopleListProps = {
  people: Person[];
  onAdd: (name: string, relation: string) => void;
  onDelete: (personId: string) => void;
  onUpdate: (personId: string, name: string, relation: string) => void;
};

export function PeopleList({
  onAdd,
  onDelete,
  onUpdate,
  people,
}: PeopleListProps) {
  const [editingId, setEditingId] = useState<string | undefined>();
  const [editingName, setEditingName] = useState("");
  const [editingRelation, setEditingRelation] = useState("");
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    onAdd(name, relation);
    setName("");
    setRelation("");
  }

  function startEdit(person: Person) {
    setEditingId(person.id);
    setEditingName(person.name);
    setEditingRelation(person.relation);
  }

  function cancelEdit() {
    setEditingId(undefined);
    setEditingName("");
    setEditingRelation("");
  }

  function saveEdit(personId: string) {
    if (!editingName.trim()) {
      return;
    }

    onUpdate(personId, editingName, editingRelation);
    cancelEdit();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>飲む人を追加</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block space-y-2 text-sm font-medium">
              <span>名前</span>
              <Input
                onChange={(event) => setName(event.target.value)}
                placeholder="例: 春子"
                value={name}
              />
            </label>
            <label className="block space-y-2 text-sm font-medium">
              <span>メモ</span>
              <Input
                onChange={(event) => setRelation(event.target.value)}
                placeholder="例: 本人"
                value={relation}
              />
            </label>
            <Button className="w-full rounded-full" type="submit">
              <UserRound aria-hidden className="h-4 w-4" />
              追加
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>飲む人</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {people.map((person) => (
              <div
                className="flex items-center gap-3 rounded-lg border border-zinc-100 bg-white p-4"
                key={person.id}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: person.color }}
                >
                  <UserRound aria-hidden className="h-5 w-5" />
                </div>
                <div className="min-w-[7rem] flex-1">
                  {editingId === person.id ? (
                    <div className="space-y-2">
                      <Input
                        aria-label="飲む人の名前"
                        onChange={(event) => setEditingName(event.target.value)}
                        value={editingName}
                      />
                      <Input
                        aria-label="飲む人のメモ"
                        onChange={(event) =>
                          setEditingRelation(event.target.value)
                        }
                        value={editingRelation}
                      />
                    </div>
                  ) : (
                    <>
                      <h3 className="truncate font-medium">{person.name}</h3>
                      <p className="truncate text-sm text-muted-foreground">
                        {person.relation}
                      </p>
                    </>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {editingId === person.id ? (
                    <>
                      <button
                        aria-label={`${person.name}を保存`}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-950 text-white"
                        onClick={() => saveEdit(person.id)}
                        type="button"
                      >
                        <Check aria-hidden className="h-4 w-4" />
                      </button>
                      <button
                        aria-label={`${person.name}の編集をキャンセル`}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-500"
                        onClick={cancelEdit}
                        type="button"
                      >
                        <X aria-hidden className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        aria-label={`${person.name}を編集`}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600"
                        onClick={() => startEdit(person)}
                        type="button"
                      >
                        <Pencil aria-hidden className="h-4 w-4" />
                      </button>
                      <button
                        aria-label={`${person.name}を削除`}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-600"
                        onClick={() => onDelete(person.id)}
                        type="button"
                      >
                        <Trash2 aria-hidden className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
