import java.io.FileInputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.TreeMap;
import com.jpexs.decompiler.flash.SWF;
import com.jpexs.decompiler.flash.tags.base.BoundedTag;
import com.jpexs.decompiler.flash.tags.base.CharacterTag;
import com.jpexs.decompiler.flash.timeline.Timelined;
import com.jpexs.decompiler.flash.types.RECT;

// Offline conversion helper, never part of the browser application.
class ExportBounds {
    public static void main(String[] args) throws Exception {
        SWF swf = new SWF(new FileInputStream(args[0]), false);
        StringBuilder out = new StringBuilder("{\n");
        boolean comma = false;
        for (var entry : new TreeMap<Integer, CharacterTag>(swf.getCharacters(false)).entrySet()) {
            CharacterTag tag = entry.getValue();
            if (!(tag instanceof BoundedTag)) continue;
            RECT rect = ((BoundedTag)tag).getRectWithFilters();
            if (comma) out.append(",\n");
            comma = true;
            out.append('"').append(entry.getKey()).append("\":{\"x\":").append(rect.Xmin / 20.0)
                .append(",\"y\":").append(rect.Ymin / 20.0)
                .append(",\"width\":").append(rect.getWidth() / 20.0)
                .append(",\"height\":").append(rect.getHeight() / 20.0).append('}');
        }
        out.append("\n}\n");
        Files.writeString(Path.of(args[1]), out.toString());
    }
}
