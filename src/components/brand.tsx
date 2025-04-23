import { AppConfigs } from "@/configs";
import Link from "next/link";

interface BrandProps {
  linkToHome?: boolean;
  reloadOnClick?: boolean;
}

export function Brand({ linkToHome = true, reloadOnClick = false }: BrandProps) {
  const handleLogoClick = (e: React.MouseEvent) => {
    // Si se especifica que se debe recargar al hacer clic, prevenimos la navegación predeterminada
    if (reloadOnClick) {
      e.preventDefault();
      // Recargamos solo el contenido actual sin cambiar de página
      window.location.reload();
    }
  };
  
  const BrandContent = () => (
    <span className="flex items-center text-2xl text-primary">
      <span className="font-semibold">En</span>
      <span className="font-light">que</span>
    </span>
  );
  
  if (linkToHome) {
    return (
      <Link 
        href={AppConfigs.routes.home} 
        className="flex items-center"
        onClick={handleLogoClick}
      >
        <BrandContent />
      </Link>
    );
  }
  
  // Si no es un enlace pero debe reaccionar al clic para recargar
  if (reloadOnClick) {
    return (
      <button 
        onClick={() => window.location.reload()} 
        className="flex items-center bg-transparent border-0 cursor-pointer p-0"
      >
        <BrandContent />
      </button>
    );
  }
  
  // Sin enlace ni acción de clic
  return <BrandContent />;
} 