import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

const brandColor = '#35B718'
const redColor = '#ef4444'
const darkBg = '#18181b' // zinc-950
const darkText = '#f4f4f5' // zinc-100

export const showConfirm = async (
    title: string,
    text: string,
    confirmButtonText: string = 'Ya, Lanjutkan',
    icon: 'warning' | 'error' | 'success' | 'info' | 'question' = 'warning'
) => {
    return MySwal.fire({
        title,
        text,
        icon,
        background: darkBg,
        color: darkText,
        showCancelButton: true,
        confirmButtonColor: brandColor,
        cancelButtonColor: '#27272a', // zinc-800
        confirmButtonText,
        cancelButtonText: 'Batal',
        customClass: {
            popup: 'border border-zinc-800 shadow-xl rounded-xl bg-zinc-950',
            confirmButton: 'text-black font-bold shadow-[0_0_15px_rgba(53,183,24,0.4)]',
            cancelButton: 'text-zinc-400 hover:text-white',
            title: 'text-zinc-100', // Keep white for dark mode title
            htmlContainer: 'text-zinc-400' // Keep gray for dark mode text
        },
        buttonsStyling: true, // Use default styling but overridden by colors
    })
}

export const showSuccess = (title: string, text?: string) => {
    return MySwal.fire({
        title,
        text,
        icon: 'success',
        background: darkBg,
        color: darkText,
        confirmButtonColor: brandColor,
        confirmButtonText: 'OK',
        customClass: {
            popup: 'border border-zinc-800 shadow-xl rounded-xl bg-zinc-950',
            confirmButton: 'text-black font-bold',
            title: 'text-zinc-100',
            htmlContainer: 'text-zinc-400'
        }
    })
}

export const showError = (title: string, text?: string) => {
    return MySwal.fire({
        title,
        text,
        icon: 'error',
        background: darkBg,
        color: darkText,
        confirmButtonColor: redColor,
        confirmButtonText: 'Tutup',
        customClass: {
            popup: 'border border-zinc-800 shadow-xl rounded-xl bg-zinc-950',
            title: 'text-red-400',
            htmlContainer: 'text-zinc-400'
        }
    })
}
