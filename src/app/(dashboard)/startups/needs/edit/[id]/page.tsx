
import { getStartupNeed } from "@/lib/actions";
import { EditNeedClient } from "./form-client";


export default async function EditStartupNeedPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
    const params = await paramsPromise;
    // Note: getStartupNeed is called without an executiveId, so isSaved/isApplied will be false
    const { need, message } = await getStartupNeed(params.id);

  return (
    <div className="mx-auto">
      <EditNeedClient initialData={need} errorMessage={need ? null : message} />
    </div>
  );
}
