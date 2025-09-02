import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const Loader = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
    <motion.div
      initial={{ rotate: 0 }}
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
    >
      <Loader2 className="w-12 h-12 text-white" />
    </motion.div>
  </div>
);

export default Loader;
