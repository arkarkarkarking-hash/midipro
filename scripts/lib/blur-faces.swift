// Face blur for blog photos (macOS Vision + Core Image). Called by scripts/blog-photos.ts.
// usage: blur-faces <in> <out.jpg> [x,y,w,h ...]   extra boxes in 0..1, top-left origin. NOBODY=1 skips upper-body head guesses (use for back views).
import Foundation
import CoreImage
import Vision
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
let inURL = URL(fileURLWithPath: args[1]), outURL = URL(fileURLWithPath: args[2])
guard var img = CIImage(contentsOf: inURL, options: [.applyOrientationProperty: true]) else { fatalError("cannot read") }
img = img.transformed(by: CGAffineTransform(translationX: -img.extent.minX, y: -img.extent.minY))
let scale = min(1, 1600 / max(img.extent.width, img.extent.height))
if scale < 1 { img = img.applyingFilter("CILanczosScaleTransform", parameters: [kCIInputScaleKey: scale]) }
let W = img.extent.width, H = img.extent.height
let ctx = CIContext()
let cg = ctx.createCGImage(img, from: img.extent)!

var boxes: [CGRect] = [] // CI coords (bottom-left origin), pixels
let faceReq = VNDetectFaceRectanglesRequest()
let bodyReq = VNDetectHumanRectanglesRequest()
bodyReq.upperBodyOnly = true
try VNImageRequestHandler(cgImage: cg).perform([faceReq, bodyReq])
// head ≈ top 45% of an upper-body box, middle 60% of its width
if ProcessInfo.processInfo.environment["NOBODY"] == nil { for h in bodyReq.results ?? [] { let b = h.boundingBox; boxes.append(CGRect(x: (b.minX + b.width * 0.2) * W, y: (b.maxY - b.height * 0.45) * H, width: b.width * 0.6 * W, height: b.height * 0.45 * H)) } }
for f in faceReq.results ?? [] { let b = f.boundingBox; boxes.append(CGRect(x: b.minX * W, y: b.minY * H, width: b.width * W, height: b.height * H)) }
let detected = boxes.count
for a in args.dropFirst(3) {
  let v = a.split(separator: ",").compactMap { Double($0) }
  boxes.append(CGRect(x: v[0] * W, y: (1 - v[1] - v[3]) * H, width: v[2] * W, height: v[3] * H))
}
var out = img
for r in boxes {
  let g = r.insetBy(dx: -r.width * 0.35, dy: -r.height * 0.35).intersection(img.extent)
  let radius = max(g.width, g.height) / 6
  let blurred = img.clampedToExtent().applyingFilter("CIGaussianBlur", parameters: [kCIInputRadiusKey: radius]).cropped(to: g)
  let mask = CIImage(color: .white).cropped(to: g)
    .applyingFilter("CIGaussianBlur", parameters: [kCIInputRadiusKey: g.width * 0.08]).cropped(to: g)
  out = blurred.applyingFilter("CIBlendWithMask", parameters: [kCIInputBackgroundImageKey: out, kCIInputMaskImageKey: mask]).cropped(to: img.extent)
}
let final = ctx.createCGImage(out, from: img.extent)!
let dest = CGImageDestinationCreateWithURL(outURL as CFURL, UTType.jpeg.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(dest, final, [kCGImageDestinationLossyCompressionQuality: 0.85] as CFDictionary)
CGImageDestinationFinalize(dest)
print("\(args[1].split(separator: "/").last!): detected \(detected), manual \(boxes.count - detected), \(Int(W))x\(Int(H))")
