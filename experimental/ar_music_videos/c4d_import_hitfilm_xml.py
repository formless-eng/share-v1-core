import c4d
from c4d import gui
import xml.etree.ElementTree as ET

def _get_tracking_info(filepath):
    info = {}
    tree = ET.parse(filepath)
    root = tree.getroot()

    avSettingsNode = root.find(".//*AudioVideoSettings")
    width = int(avSettingsNode.find("Width").text)
    height = int(avSettingsNode.find("Height").text)
    info['resolution_x'] = width
    info['resolution_y'] = height
    info['fps'] = 60

    cameraNode = root.find(".//*CameraLayer")
    if cameraNode is None:
        raise Exception("Unable to find CameraLayer in Composite")

    timeKeys = []
    camPositions = []
    camRotations = []
    camZoomVals = []

    cameraPosAnim = cameraNode.findall(".//*position/Animation")
    if len(cameraPosAnim) > 0:
        print("----- Camera Position Data -----")
        posKeys = list(cameraPosAnim[0])
        for key in posKeys:
            timeKeys.append(key.get('Time'))
            position = key.find('.//*FXPoint3_32f')
            camPositions.append( (float(position.get('X')), float(position.get('Y')), float(position.get('Z'))) )

    cameraRotationAnim = cameraNode.findall(".//*orientation/Animation")
    if len(cameraRotationAnim) > 0:
        print("----- Camera Rotation Data -----")
        rotationKeys = list(cameraRotationAnim[0])
        assert len(timeKeys) == len(rotationKeys) # Must match the timings already recorded for Position Data
        for key in rotationKeys:
            euler = key.find('.//*Orientation3D')
            camRotations.append( (float(euler.get('X')), float(euler.get('Y')), float(euler.get('Z'))) )

    cameraZoomAnim = cameraNode.findall(".//*zoom/Animation")
    if len(cameraZoomAnim) > 0:
        print("----- Camera Zoom Data -----")
        zoomKeys = list(cameraZoomAnim[0])
        assert len(timeKeys) == len(zoomKeys) # Must match the timings already recorded for Position Data
        for key in zoomKeys:
            zoom = key.find('Value/float').text
            camZoomVals.append(float(zoom))

    info['time_keys'] = timeKeys
    info['cam_positions'] = camPositions
    info['cam_rotations'] = camRotations
    info['cam_zooms'] = camZoomVals
    return info

def main(_):
    tracking_info = _get_tracking_info('/Users/brandon/Downloads/2020-12-29 12-45-49.hfcs')

    num_frames = len(tracking_info['time_keys'])
    print('num frames: %d\n' % num_frames)
    fps = tracking_info['fps']
    print('original doc fps: %d\n' % doc.GetFps())
    doc.SetFps(fps)
    doc.SetMaxTime(c4d.BaseTime(num_frames, fps))
    print('new doc fps: %d\n' % doc.GetFps())
    # fps = 60

    object_map = {}
    for o in doc.GetObjects():
        object_map[o.GetName()] = o
    camera = object_map['Camera']

    for track in camera.GetCTracks():
        track.Remove()

    x_track = c4d.CTrack(camera, c4d.DescID(c4d.DescLevel(c4d.ID_BASEOBJECT_POSITION, c4d.DTYPE_VECTOR, 0), c4d.DescLevel(c4d.VECTOR_X, c4d.DTYPE_REAL, 0)))
    y_track = c4d.CTrack(camera, c4d.DescID(c4d.DescLevel(c4d.ID_BASEOBJECT_POSITION, c4d.DTYPE_VECTOR, 0), c4d.DescLevel(c4d.VECTOR_Y, c4d.DTYPE_REAL, 0)))
    z_track = c4d.CTrack(camera, c4d.DescID(c4d.DescLevel(c4d.ID_BASEOBJECT_POSITION, c4d.DTYPE_VECTOR, 0), c4d.DescLevel(c4d.VECTOR_Z, c4d.DTYPE_REAL, 0)))

    rotation_x = c4d.CTrack(camera, c4d.DescID(c4d.DescLevel(c4d.ID_BASEOBJECT_REL_ROTATION, c4d.DTYPE_VECTOR, 0), c4d.DescLevel(c4d.VECTOR_X, c4d.DTYPE_REAL, 0)))
    rotation_y = c4d.CTrack(camera, c4d.DescID(c4d.DescLevel(c4d.ID_BASEOBJECT_REL_ROTATION, c4d.DTYPE_VECTOR, 0), c4d.DescLevel(c4d.VECTOR_Y, c4d.DTYPE_REAL, 0)))
    rotation_z = c4d.CTrack(camera, c4d.DescID(c4d.DescLevel(c4d.ID_BASEOBJECT_REL_ROTATION, c4d.DTYPE_VECTOR, 0), c4d.DescLevel(c4d.VECTOR_Z, c4d.DTYPE_REAL, 0)))

    camera.InsertTrackSorted(x_track)
    camera.InsertTrackSorted(y_track)
    camera.InsertTrackSorted(z_track)

    camera.InsertTrackSorted(rotation_x)
    camera.InsertTrackSorted(rotation_y)
    camera.InsertTrackSorted(rotation_z)

    x_curve = x_track.GetCurve()
    y_curve = y_track.GetCurve()
    z_curve = z_track.GetCurve()

    rotation_x_curve = rotation_x.GetCurve()
    rotation_y_curve = rotation_y.GetCurve()
    rotation_z_curve = rotation_z.GetCurve()

    # scale = 1.0 / 100.0 # Convert Apple SceneKit meters to C4D cm
    scale = 1

    for frame, time_key in enumerate(tracking_info['time_keys']):
        t = int(time_key)
        print('t = %f\n' % t)
        print('tprime = %f\n' % (float(frame) / float(fps)))
        x, y, z = tracking_info['cam_positions'][frame][0], tracking_info['cam_positions'][frame][1], tracking_info['cam_positions'][frame][2]

        x_curve.AddKey(c4d.BaseTime(frame, fps))['key'].SetValue(x_curve, x * scale)
        y_curve.AddKey(c4d.BaseTime(frame, fps))['key'].SetValue(y_curve, y * scale)
        # RH to LH
        z_curve.AddKey(c4d.BaseTime(frame, fps))['key'].SetValue(z_curve, -1* z * scale)

        # NOTE: Must convert rotation vector of (degree) units to radians.
        rx, ry, rz = tracking_info['cam_rotations'][frame][0], tracking_info['cam_rotations'][frame][1], tracking_info['cam_rotations'][frame][2]
        rotation_x_curve.AddKey(c4d.BaseTime(frame, fps))['key'].SetValue(rotation_x_curve, c4d.utils.DegToRad(-rx))
        rotation_y_curve.AddKey(c4d.BaseTime(frame, fps))['key'].SetValue(rotation_y_curve, c4d.utils.DegToRad(-ry))
        rotation_z_curve.AddKey(c4d.BaseTime(frame, fps))['key'].SetValue(rotation_z_curve, c4d.utils.DegToRad(-rz))

# Execute main()
if __name__=='__main__':
    main()