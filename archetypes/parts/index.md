+++
{{ $number  := .File.ContentBaseName -}}
{{ $title   := "Unknown" -}}
{{ $image   := "" -}}
{{ $url     := "" -}}
{{ $aliases := slice -}}

{{ $apiBase  := "https://rebrickable.com/api/v3/lego/parts/" -}}
{{ $apiKey   := site.Data.secrets.rebrickable -}}
{{ $request  := print $apiBase $number "/?key=" $apiKey -}}
{{ $response := resources.GetRemote $request -}}

{{ with $response.Content -}}
  {{ $json := . | transform.Unmarshal -}}
  {{ $title = $json.name         | default $title -}}
  {{ $image = $json.part_img_url | default $image -}}
  {{ $url   = $json.part_url     | default $url -}}
  {{ range $json.molds | default slice -}}
    {{ $aliases = $aliases | append (print "/part/" .) -}}
  {{ end -}}
  {{ range $json.alternates | default slice -}}
    {{ $aliases = $aliases | append (print "/part/" .) -}}
  {{ end -}}
{{ end -}}

title   = '{{ $title }}'
draft   = true
{{ with $aliases | sort | uniq -}}
aliases = [
  '{{ delimit . "',\n  '" }}',
]
{{- end }}

[params]
  part_url = '{{ $url }}'
  {{ with $image -}}
  images   = ['{{ $image }}']
  {{- end }}
+++
