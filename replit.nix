{pkgs}: {
  deps = [
    pkgs.imagemagick
    pkgs.ffmpeg
    pkgs.pandoc
    pkgs.zip
    pkgs.jq
    pkgs.postgresql
  ];
}
