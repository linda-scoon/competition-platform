type ChallengeDraftFormValues = {
  title: string;
  shortDescription: string;
  longDescription: string;
  coverImageId: string | null;
};

type CoverImageOption = {
  id: string;
  status: string;
};

type ChallengeDraftFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  showPrimarySubmit?: boolean;
  secondarySubmitLabel?: string;
  secondarySubmitAction?: (formData: FormData) => void | Promise<void>;
  values: ChallengeDraftFormValues;
  coverImageOptions: CoverImageOption[];
};

export function ChallengeDraftForm({
  action,
  submitLabel,
  showPrimarySubmit = true,
  secondarySubmitLabel,
  secondarySubmitAction,
  values,
  coverImageOptions,
}: ChallengeDraftFormProps) {
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

      <label className="block text-sm">
        <span className="mb-1 block">Cover image asset</span>
        <select
          className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2"
          defaultValue={values.coverImageId ?? ""}
          name="coverImageId"
        >
          <option value="">No cover image</option>
          {coverImageOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.id} ({option.status})
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap gap-3">
        {showPrimarySubmit ? (
          <button
            className="rounded-md bg-indigo-500 px-4 py-2 font-medium text-white hover:bg-indigo-400"
            type="submit"
          >
            {submitLabel}
          </button>
        ) : null}

        {secondarySubmitAction && secondarySubmitLabel ? (
          <button
            className="rounded-md border border-emerald-500/60 bg-emerald-500/10 px-4 py-2 font-medium text-emerald-200 hover:bg-emerald-500/20"
            formAction={secondarySubmitAction}
            type="submit"
          >
            {secondarySubmitLabel}
          </button>
        ) : null}
      </div>
    </form>
  );
}
