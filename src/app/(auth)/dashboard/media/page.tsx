import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { ensureChallengeCreator } from "@/lib/challenges/draft-repository";
import { listOwnedMediaAssetsFromDb } from "@/lib/media/repository";

import { uploadMediaImageAction } from "./actions";

type DashboardMediaPageProps = {
  searchParams?: Promise<{
    uploaded?: string;
    error?: string;
  }>;
};

export default async function DashboardMediaPage({ searchParams }: DashboardMediaPageProps) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in?returnTo=/dashboard/media");
  }

  await ensureChallengeCreator(session.user);

  const [assets, params] = await Promise.all([
    listOwnedMediaAssetsFromDb(session.user.id),
    searchParams ? searchParams : Promise.resolve(undefined),
  ]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col p-6">
      <h1 className="text-3xl font-semibold">Media library</h1>
      <p className="mt-2 text-sm text-slate-300">
        Upload image assets. New uploads remain pending until an admin approves them.
      </p>

      {params?.uploaded === "1" ? (
        <p className="mt-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          Image uploaded and queued for moderation.
        </p>
      ) : null}

      {params?.error === "file_required" ? (
        <p className="mt-4 rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
          Select an image file before submitting.
        </p>
      ) : null}

      {params?.error === "images_only" ? (
        <p className="mt-4 rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
          Only image uploads are supported in this packet.
        </p>
      ) : null}

      {params?.error === "file_too_large" ? (
        <p className="mt-4 rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
          Image exceeds the 5 MB upload limit.
        </p>
      ) : null}

      <form
        action={uploadMediaImageAction}
        className="mt-6 space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5"
      >
        <h2 className="text-lg font-medium">Upload image</h2>

        <label className="block text-sm">
          <span className="mb-1 block">Asset type</span>
          <select
            className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2"
            defaultValue="CHALLENGE_COVER"
            name="type"
          >
            <option value="CHALLENGE_COVER">Challenge cover image</option>
            <option value="PROFILE_AVATAR">Profile avatar image</option>
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block">Image file</span>
          <input
            accept="image/*"
            className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2"
            name="imageFile"
            required
            type="file"
          />
        </label>

        <button
          className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
          type="submit"
        >
          Upload image
        </button>
      </form>

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="text-lg font-medium">My assets</h2>

        {assets.length < 1 ? (
          <p className="mt-3 text-sm text-slate-300">No assets uploaded yet.</p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {assets.map((asset) => (
              <li key={asset.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                <img
                  alt="Uploaded media asset preview"
                  className="h-40 w-full rounded-md object-cover"
                  src={asset.storageKey}
                />
                <p className="mt-3 text-xs text-slate-300">ID: {asset.id}</p>
                <p className="text-xs text-slate-300">Type: {asset.type}</p>
                <p className="text-xs text-slate-300">Status: {asset.status}</p>
                <p className="text-xs text-slate-400">
                  Uploaded: {asset.createdAt.toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
