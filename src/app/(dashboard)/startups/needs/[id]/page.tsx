
import { getStartupNeed } from "@/lib/actions";
import { ViewNeedClient } from "./view-need-client";

export default async function ViewStartupNeedPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
    const params = await paramsPromise;
    const { need, message } = await getStartupNeed(params.id);

  return (
    <div className="mx-auto">
      <ViewNeedClient initialData={need} errorMessage={need ? null : message} />
    </div>
  );
}
