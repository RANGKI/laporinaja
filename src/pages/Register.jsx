import { useState, useEffect } from "react";
import Input from "../components/Elements/Input";
import Button from "../components/Elements/Button";
import InputUpload from "../components/Elements/InputUpload";
import AuthLayout from "../components/Layouts/AuthLayout";
import supabase from "../../supabaseClient";
import { parseKtpText } from "../helper/parseKtpParser";
import { isKecamatanValid } from "../helper/isKecamatanValid";
import { showSuccess, showError, showConfirmation, showSend } from "../components/Elements/Alert";
import { useNavigate } from "react-router";
import checkImageSize from "../helper/checkImageSize";

function Register() {
  const navigate = useNavigate();
  const [emails, setEmails] = useState([]);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        navigate("/");
      }

      const { data, error } = await supabase
        .from("user")
        .select("email");

      if (error) {
        console.error("Error fetching emails:", error.message);
      } else {
        const emailList = data.map((user) => user.email);
        setEmails(emailList);
      }
    };
    checkSession();
  }, [navigate]);

  const [formData, setFormData] = useState({
    photo: null,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.files[0] });
  };

  const handleClearFile = () => {
    setFormData({ ...formData, photo: null });
  };

  const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });


  const handleSubmit = async (e) => {
    e.preventDefault();

    const file = formData.photo;

    if (!file) {
      showError({
        title: "Gagal",
        text: "Mohon upload foto KTP terlebih dahulu.",
        confirmButtonColor: "#d33",
      });
      return;
    }

    const sizeCheck = checkImageSize(file);
    if (!sizeCheck.valid) {
      showError({
        title: "Gagal",
        text: sizeCheck.message,
        confirmButtonColor: "#d33",
      });
      return;
    }

    if (emails.includes(e.target.email.value)) {
      showError({
        title: "Gagal",
        text: "Akun sudah ada!",
        confirmButtonColor: "#d33",
      });
      return;
    }
    
    if (e.target.password.value.length < 6) {
      showError({
        title: "Gagal",
        text: "Password harus lebih dari 6 karakter!",
        confirmButtonColor: "#d33",
      });
      return;
    }

    setIsLoading(true);
    const toast = showSend({ title: "Memverifikasi KTP" });

    try {
      const toast = showSend({ title: "Memverifikasi KTP" });
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("VITE_GEMINI_API_KEY is missing in .env");
      }

      const base64Image = await toBase64(file);

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inlineData: {
                      mimeType: file.type,
                      data: base64Image.replace(/^data:image\/\w+;base64,/, ""),
                    },
                  },
                  {
                    text: "Extract the full raw text content from this Indonesian KTP image. Do not explain. Just return all text.",
                  },
                ],
              },
            ],
          }),
        }
      );

      const geminiJson = await geminiRes.json();
      const extractedText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      const parsedData = parseKtpText(extractedText);
      const valid = isKecamatanValid(parsedData.kecamatan);

      if (!valid) {
        showError({
          title: "Gagal",
          text: "Kecamatan tidak valid!",
          confirmButtonColor: "#d33",
        });
        return;
      }

      if (!extractedText.includes("NIK")) {
        showError({
          title: "Gagal",
          text: "Gagal mengenali KTP. Pastikan foto jelas dan sesuai.",
          confirmButtonColor: "#d33",
        });
        return;
      }

      const siteUrl = import.meta.env.VITE_SITE_URL;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: e.target.email.value,
        password: e.target.password.value,
        options: {
          emailRedirectTo: `${siteUrl}`,
        },
      });

      if (authError) {
        showError({
          title: "Gagal",
          text: `Registration failed: ${authError.message}`,
          confirmButtonColor: "#d33",
        });
        return;
      }

      if (authData.user) {
        let formated_tanggal = null;
        if (parsedData.tanggalLahir) {
          const [day, month, year] = parsedData.tanggalLahir.split("-");
          formated_tanggal = `${year}-${month}-${day}`;
        }

        const { error } = await supabase.from("user").insert([
          {
            id: authData.user.id,
            email: e.target.email.value,
            username: parsedData.nama,
            nik: parsedData.nik,
            gender: parsedData.jenisKelamin,
            kelurahan: parsedData.kelurahan,
            tanggal_lahir: formated_tanggal,
            rt: parsedData.rtRw.split("/")[0]?.trim(),
            rw: parsedData.rtRw.split("/")[1]?.trim(),
            kecamatan: parsedData.kecamatan,
            role: "user",
          },
        ]);

        if (error) {
          showError({
            title: "Gagal",
            text: `Gagal menyimpan data pengguna: ${error.message}`,
            confirmButtonColor: "#d33",
          });
          return;
        }

        const fileExt = file.name.split(".").pop();
        const fileName = `${authData.user.id}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("fotoktp")
          .upload(filePath, file);

        if (uploadError) {
          showError({
            title: "Gagal",
            text: `Upload gagal: ${uploadError.message}`,
            confirmButtonColor: "#d33",
          });
          return;
        }

        showSuccess({
          title: "Berhasil!",
          text: "Data telah dikirim! Silahkan check email untuk verifikasi",
          confirmButtonColor: "#52BA5E",
        });

        navigate("/login");
      }
    } catch (error) {
      showError({
        title: "Gagal",
        text: error.message || "Terjadi kesalahan saat membaca gambar.",
        confirmButtonColor: "#d33",
      });
    } finally {
      setIsLoading(false);
      toast.close();
    }

  };

  return (
    <AuthLayout
      title="Daftar untuk akun Anda"
      bottomText="Sudah punya akun?"
      bottomLink="Masuk"
      bottomHref="/login"
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
        <Input
          label="Username"
          id="username"
          name="username"
          type="text"
          autoComplete="username"
        />

        <Input
          label="Email"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
        />

        <Input
          label="Password"
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
        />

        <InputUpload
          label="Foto KTP"
          name="photo"
          value={formData.photo}
          onChange={handleChange}
          onClear={handleClearFile}
          disabled={isLoading}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Memproses..." : "Daftar"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default Register;