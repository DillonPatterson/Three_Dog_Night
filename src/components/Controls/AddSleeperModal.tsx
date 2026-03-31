interface Props {
  onClose: () => void
}

export function AddSleeperModal({ onClose }: Props) {
  onClose()
  return null
}
