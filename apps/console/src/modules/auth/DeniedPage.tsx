import { Button } from "@dentiva/ui";
import { useAuth } from "@/lib/auth";
import { AuthLayout, FormAlert } from "./AuthLayout";

export function DeniedPage() {
  const { deniedReason, signOut, refresh } = useAuth();
  return (
    <AuthLayout title="Akses ditolak" subtitle="Akun ini tidak bisa membuka Dentiva Console.">
      <div className="space-y-4">
        <FormAlert>{deniedReason ?? "Akun tidak terdaftar sebagai operator aktif."}</FormAlert>
        <p className="text-sm text-text-muted">
          Console hanya untuk operator Dentiva. Akun klinik (admin, dokter, resepsionis) masuk lewat aplikasi klinik.
          Jika Anda operator, minta owner Console mengaktifkan akun Anda.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => void refresh()}>
            Coba lagi
          </Button>
          <Button className="flex-1" onClick={() => void signOut()}>
            Keluar
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}
