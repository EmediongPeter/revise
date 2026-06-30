import { notFound } from "next/navigation";
import PracticeRoomClient from "@/components/practice/PracticeRoomClient";
import { getPracticeRoom } from "@/lib/actions/practice.actions";

const PracticeRoomPage = async ({
    params,
}: {
    params: Promise<{ workspaceSlug: string; assignmentId: string }>;
}) => {
    const { workspaceSlug, assignmentId } = await params;
    const result = await getPracticeRoom(assignmentId);

    if (!result.success || result.data.workspaceSlug !== workspaceSlug) {
        notFound();
    }

    return <PracticeRoomClient initialRoom={result.data} />;
};

export default PracticeRoomPage;
