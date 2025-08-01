import Modal from "../Elements/Modal";
import Button from "../Elements/Button";
import LabelStatus from "../Elements/LabelStatus";

const statusLabels = {
  waiting: "Menunggu",
  processing: "Proses",
  done: "Selesai",
  reject: "Ditolak",
};

const DetailComplaintModal = ({ isOpen, onClose, complaint }) => {
  if (!complaint) return null;

  const label = statusLabels[complaint.label] || "Menunggu";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detail Keluhan"
      className="z-10 mx-6 my-6 w-full"
      footer={
        <Button onClick={onClose} className="w-full">
          Tutup
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="text-md text-gray-600">
          <span className="font-medium">Judul:</span>{" "}
          <span>{complaint.title}</span>
        </p>
        <p className="text-md text-gray-600">
          <span className="font-medium">Catatan:</span>{" "}
          <span>{complaint.note}</span>
        </p>
        <p className="text-md text-gray-600">
          <span className="font-medium">Lokasi:</span>{" "}
          <span>{complaint.location}</span>
        </p>
        <p className="text-md text-gray-600">
          <span className="font-medium">Kategori:</span>{" "}
          <span>{complaint.category}</span>
        </p>
        <p className="text-md text-gray-600">
          <span className="font-medium">Status:</span>{" "}
          <LabelStatus label={label} />
        </p>
        <p className="text-md text-gray-600">
          <span className="font-medium">Tanggal:</span>{" "}
          <span>{complaint.incident_date}</span>
        </p>
        {complaint.imageUrl && (
          <div className="mt-4">
            <p className="text-md text-gray-600 font-medium">Foto:</p>
            <img
              src={complaint.imageUrl}
              alt={complaint.title}
              className="w-96 h-96 object-cover rounded-lg"
            />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default DetailComplaintModal;