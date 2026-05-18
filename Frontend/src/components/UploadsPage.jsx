export default function UploadsPage({
  currentTheme,
  uploadedFiles = [],
  isLoggedIn = false,
  isUploading = false,
  onUploadFile,
  onClearUploads,
  onLogin,
}) {
  const border = currentTheme?.border || "border-white/10";
  const card = currentTheme?.card || "bg-zinc-950";

  function getFileName(file) {
    if (typeof file === "string") return file;
    return file?.name || file?.filename || "Unknown file";
  }

  function getFileType(file) {
    const name = getFileName(file).toLowerCase();

    if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".webp")) return "Image";
    if (name.endsWith(".pdf")) return "PDF";
    if (name.endsWith(".js") || name.endsWith(".jsx") || name.endsWith(".ts") || name.endsWith(".tsx") || name.endsWith(".py")) return "Code";
    if (name.endsWith(".txt") || name.endsWith(".md")) return "Text";
    if (name.endsWith(".csv") || name.endsWith(".xlsx")) return "Spreadsheet";

    return "File";
  }

  return (
    <section className={`eden-page flex-1 overflow-y-auto rounded-3xl border ${border} ${card} p-6`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-[0.15em]">
            UPLOADS
          </h2>

          <p className="mt-2 text-sm opacity-70">
            Manage uploaded images, PDFs, text files, code files, and future multimodal inputs.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {isLoggedIn ? (
            <label className="cursor-pointer rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:scale-[1.02]">
              {isUploading ? "Uploading..." : "+ Upload File"}
              <input
                type="file"
                className="hidden"
                onChange={onUploadFile}
              />
            </label>
          ) : (
            <button
              type="button"
              onClick={onLogin}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:scale-[1.02]"
            >
              Login To Upload
            </button>
          )}

          {uploadedFiles.length > 0 && (
            <button
              type="button"
              onClick={onClearUploads}
              className="rounded-2xl border border-red-400/20 bg-black/30 px-5 py-3 text-sm font-bold text-red-300 transition hover:scale-[1.02]"
            >
              Clear List
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <p className="text-xs uppercase tracking-[0.25em] opacity-50">
            Uploaded Files
          </p>
          <p className="mt-2 text-3xl font-bold">
            {uploadedFiles.length}
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <p className="text-xs uppercase tracking-[0.25em] opacity-50">
            Vision
          </p>
          <p className="mt-2 text-sm opacity-70">
            Image analysis can connect here when the vision model is stable.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <p className="text-xs uppercase tracking-[0.25em] opacity-50">
            File Memory
          </p>
          <p className="mt-2 text-sm opacity-70">
            Uploaded files can later attach to specific saved chats.
          </p>
        </div>
      </div>

      {uploadedFiles.length === 0 ? (
        <div className="mt-6 flex min-h-[260px] items-center justify-center text-center">
          <div className="max-w-md rounded-3xl border border-white/10 bg-black/20 p-8 shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">
              +
            </div>

            <h3 className="mt-5 text-xl font-bold tracking-[0.08em]">
              No uploads yet.
            </h3>

            <p className="mt-3 text-sm leading-relaxed opacity-70">
              Upload files from chat or this page. Eden will show them here.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {uploadedFiles.map((file, index) => {
            const name = getFileName(file);
            const type = getFileType(file);

            return (
              <div
                key={`${name}-${index}`}
                className="eden-card rounded-3xl border border-white/10 bg-black/20 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold">
                      {name}
                    </p>

                    <p className="mt-2 text-xs uppercase tracking-[0.2em] opacity-50">
                      {type}
                    </p>
                  </div>

                  <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs opacity-70">
                    #{index + 1}
                  </span>
                </div>

                <p className="mt-4 text-sm opacity-70">
                  Stored in frontend upload history. Backend file library can connect later.
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}