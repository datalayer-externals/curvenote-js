import { ALL_BLOCKS, BlockId, versionIdToString } from '@curvenote/blocks';
import { Block, Version, VersionQueryOpts } from '../../models';
import { ISession } from '../../session/types';

export async function getLatestVersion<T extends ALL_BLOCKS>(
  session: ISession,
  blockId: BlockId,
  query?: VersionQueryOpts,
) {
  session.log.debug(`getLatestVersion(${JSON.stringify(blockId)})`);
  const block = await new Block(session, blockId).get();
  const { latest_version } = block.data;
  if (!latest_version)
    throw new Error(
      `Block with name "${block.data.name}" has no versions, do you need to save the draft?`,
    );
  session.log.debug(`Requesting latest version ${latest_version}`);
  const versionId = { ...block.id, version: latest_version };
  session.log.debug(`Fetching latest version of block: ${versionIdToString(versionId)}`);
  const version = await new Version<T>(session, versionId).get(query);
  return { block, version };
}