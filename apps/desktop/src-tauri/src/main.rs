// Tanpa jendela konsol tambahan di Windows (rilis)
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    dentiva_desktop_lib::run()
}
