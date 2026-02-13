export default function Header({ handleLogout }: { handleLogout: () => void }) {
  return (
    <div className="flex justify-between items-center mb-4">
      <h1 className="text-2xl font-bold">TWISTERS</h1>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-lg bg-[#3D5A2D] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2d4321]"
      >
        Logout
      </button>
    </div>
  );
}
