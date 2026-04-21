type ChallengeDraftFormValues = {
  title: string;
  shortDescription: string;
  longDescription: string;
};

type ChallengeDraftFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  values: ChallengeDraftFormValues;
};

export function ChallengeDraftForm({ action, submitLabel, values }: ChallengeDraftFormProps) {
  return (
    <form action={action} className="mt-6 space-y-4">
      <label className="block text-sm">
        <span className="mb-1 block">Title</span>
        <input
          className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2"
          defaultValue={values.title}
          maxLength={120}
          minLength={3}
          name="title"
          required
          type="text"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block">Short description</span>
        <textarea
          className="min-h-24 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2"
          defaultValue={values.shortDescription}
          maxLength={280}
          minLength={10}
          name="shortDescription"
          required
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block">Long description</span>
        <textarea
          className="min-h-40 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2"
          defaultValue={values.longDescription}
          maxLength={5000}
          minLength={30}
          name="longDescription"
          required
        />
      </label>

      <button className="rounded-md bg-indigo-500 px-4 py-2 font-medium text-white hover:bg-indigo-400" type="submit">
        {submitLabel}
      </button>
    </form>
  );
}
