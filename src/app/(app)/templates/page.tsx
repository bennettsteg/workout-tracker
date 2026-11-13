import { ClipboardList, Plus } from "lucide-react";

import { DeleteTemplateButton } from "@/components/templates/DeleteTemplateButton";
import { exerciseName } from "@/components/templates/exerciseOptions";
import { TemplateFormDialog } from "@/components/templates/TemplateFormDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listExercises } from "@/lib/exercises/store";
import { listTemplates } from "@/lib/templates/store";

export default async function TemplatesPage() {
  const [templates, exercises] = await Promise.all([listTemplates(), listExercises()]);
  const exerciseOptions = exercises.map((e) => ({ id: e.id, name: e.name }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">Templates</h1>
        <TemplateFormDialog
          exercises={exerciseOptions}
          trigger={
            <Button disabled={exercises.length === 0}>
              <Plus /> New Template
            </Button>
          }
        />
      </div>

      {exercises.length === 0 && (
        <p className="text-muted-foreground">Add an exercise first, then build a template from it.</p>
      )}

      {templates.length === 0 && exercises.length > 0 ? (
        <p className="text-muted-foreground">No templates yet. Create one to speed up logging.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {templates.map((template) => (
            <Card key={template.id} size="sm">
              <CardContent className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <ClipboardList className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{template.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {template.exercises
                        .map((te) => exerciseName(exerciseOptions, te.exerciseId))
                        .join(", ")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <TemplateFormDialog
                    exercises={exerciseOptions}
                    template={{
                      id: template.id,
                      name: template.name,
                      exercises: template.exercises.map((te) => ({
                        exerciseId: te.exerciseId,
                        targetSets: te.targetSets,
                        targetReps: te.targetReps,
                        targetWeight: te.targetWeight,
                      })),
                    }}
                    trigger={<Button variant="outline">Edit</Button>}
                  />
                  <DeleteTemplateButton id={template.id} name={template.name} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
