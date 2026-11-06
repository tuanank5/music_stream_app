import { YStack } from "tamagui";
import { useAuth } from "../../contexts/AuthContext";
import { useLibraryData } from "../../contexts/DataContext";
import { useAction } from "../../hooks/useAction";
import { setFollow } from "../../services/libraryService";
import { Action, AppText, ErrorText } from "../ui/index";
// Theo dõi/bỏ theo dõi nghệ sĩ.
export function FollowButton({
  artistId,
  inline = false,
}: {
  artistId: string;
  inline?: boolean;
}) {
  const { user } = useAuth();
  const { followingIds } = useLibraryData();
  const action = useAction();
  const following = followingIds.includes(artistId);
  return (
    <YStack alignItems="center">
      <Action
        role="button"
        aria-label={following ? "Bỏ theo dõi nghệ sĩ" : "Theo dõi nghệ sĩ"}
        disabled={action.busy || !user || user.uid === artistId}
        aria-busy={action.busy}
        aria-pressed={following}
        onPress={() => {
          if (!user) return;
          void action.run(() => setFollow(user.uid, artistId, !following));
        }}
        borderWidth={1}
        borderColor={following ? "borderColor" : "primary"}
        backgroundColor={following ? "surface" : "primary"}
        borderRadius={24}
        paddingVertical={7}
        paddingHorizontal="4.5"
        marginTop={inline ? 0 : "2"}
        minWidth={74}
        alignItems="center"
        justifyContent="center"
        {...(action.busy ? { opacity: 0.5 } : {})}
      >
        <AppText
          fontSize="caption"
          lineHeight="caption"
          textAlign="center"
          fontWeight="700"
          color={following ? "color" : "onPrimary"}
        >
          {following ? "Unfollow" : "Follow"}
        </AppText>
      </Action>

      <ErrorText message={action.error} />
    </YStack>
  );
}
