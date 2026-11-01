// No provider: pass a pack's namespace straight to the component. Same words, no context.
import { HoldToConfirm } from '@punji/ui/hold-to-confirm';
import { hi } from '@punji/ui/locale/hi';

export function SendButton({ onSend }: { onSend: () => void }) {
  return <HoldToConfirm onConfirm={onSend} labels={hi.messages.holdToConfirm}>₹5,00,000 भेजें</HoldToConfirm>;
}
