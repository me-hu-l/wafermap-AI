from math import ceil

from app.schemas.wafer import (
    NotchOrientation,
    Point,
    WaferLayoutRequest,
    WaferShot,
)


def rotate_point(point: Point, orientation: NotchOrientation) -> Point:
    if orientation == NotchOrientation.LEFT:
        return Point(x=point.y, y=-point.x)
    if orientation == NotchOrientation.UP:
        return Point(x=-point.x, y=-point.y)
    if orientation == NotchOrientation.RIGHT:
        return Point(x=-point.y, y=point.x)
    return point


def is_shot_within_usable_area(
    origin_x: float,
    origin_y: float,
    shot_width: float,
    shot_height: float,
    usable_radius: float,
) -> bool:
    corners = (
        (origin_x, origin_y),
        (origin_x + shot_width, origin_y),
        (origin_x + shot_width, origin_y + shot_height),
        (origin_x, origin_y + shot_height),
    )
    radius_squared = usable_radius * usable_radius
    return all(x * x + y * y <= radius_squared for x, y in corners)


def generate_valid_shots(request: WaferLayoutRequest) -> list[WaferShot]:
    usable_radius = request.wafer_diameter / 2 - request.edge_exclusion
    max_x = ceil(request.wafer_diameter / request.shot_width / 2) + 1
    max_y = ceil(request.wafer_diameter / request.shot_height / 2) + 1
    shots: list[WaferShot] = []

    for shot_x in range(-max_x, max_x + 1):
        origin_x = shot_x * request.shot_width + request.center_offset_x
        for shot_y in range(-max_y, max_y + 1):
            origin_y = shot_y * request.shot_height + request.center_offset_y
            if not is_shot_within_usable_area(
                origin_x,
                origin_y,
                request.shot_width,
                request.shot_height,
                usable_radius,
            ):
                continue

            unrotated_corners = (
                Point(x=origin_x, y=origin_y),
                Point(x=origin_x + request.shot_width, y=origin_y),
                Point(
                    x=origin_x + request.shot_width,
                    y=origin_y + request.shot_height,
                ),
                Point(x=origin_x, y=origin_y + request.shot_height),
            )
            shots.append(
                WaferShot(
                    shot_x=shot_x,
                    shot_y=shot_y,
                    origin_x=origin_x,
                    origin_y=origin_y,
                    center_x=origin_x + request.shot_width / 2,
                    center_y=origin_y + request.shot_height / 2,
                    corners=[
                        rotate_point(point, request.notch_orientation)
                        for point in unrotated_corners
                    ],
                )
            )

    return shots
